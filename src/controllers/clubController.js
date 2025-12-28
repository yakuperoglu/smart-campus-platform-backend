/**
 * Club Controller
 * Handles club CRUD and membership operations
 */

const { AppError } = require('../middleware/errorHandler');
const { Op } = require('sequelize');

/**
 * Get all clubs
 * GET /api/v1/clubs
 */
const getAllClubs = async (req, res, next) => {
    try {
        const { Club, User } = require('../models');
        const { category, search } = req.query;

        const where = { is_active: true };

        if (category && category !== 'all') {
            where.category = category;
        }

        if (search) {
            where[Op.or] = [
                { name: { [Op.iLike]: `%${search}%` } },
                { description: { [Op.iLike]: `%${search}%` } }
            ];
        }

        const clubs = await Club.findAll({
            where,
            // include: [
            //     {
            //         model: User,
            //         as: 'president',
            //         attributes: ['id', 'email', 'first_name', 'last_name']
            //     },
            //     {
            //         model: User,
            //         as: 'advisor',
            //         attributes: ['id', 'email', 'first_name', 'last_name']
            //     }
            // ],
            order: [['name', 'ASC']]
        });

        res.json({
            success: true,
            data: clubs
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get club by ID
 * GET /api/v1/clubs/:id
 */
const getClubById = async (req, res, next) => {
    try {
        const { Club, ClubMembership, User } = require('../models');
        const { id } = req.params;

        const club = await Club.findByPk(id, {
            include: [
                // {
                //     model: User,
                //     as: 'president',
                //     attributes: ['id', 'email', 'first_name', 'last_name']
                // },
                // {
                //     model: User,
                //     as: 'advisor',
                //     attributes: ['id', 'email', 'first_name', 'last_name']
                // },
                {
                    model: ClubMembership,
                    as: 'memberships',
                    where: { status: 'active' },
                    required: false,
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'email', 'first_name', 'last_name', 'profile_picture_url']
                        }
                    ]
                }
            ]
        });

        if (!club) {
            return next(new AppError('Club not found', 404, 'CLUB_NOT_FOUND'));
        }

        res.json({
            success: true,
            data: { club }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Create club
 * POST /api/v1/clubs
 */
const createClub = async (req, res, next) => {
    try {
        const { Club } = require('../models');
        const {
            name,
            description,
            category,
            image_url,
            president_id,
            advisor_id,
            meeting_schedule,
            location,
            max_members,
            contact_email,
            social_links
        } = req.body;

        const club = await Club.create({
            name,
            description,
            category: category || 'general',
            image_url,
            president_id,
            advisor_id,
            founded_date: new Date(),
            meeting_schedule,
            location,
            max_members,
            contact_email,
            social_links
        });

        res.status(201).json({
            success: true,
            message: 'Club created successfully',
            data: { club }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Update club
 * PUT /api/v1/clubs/:id
 */
const updateClub = async (req, res, next) => {
    try {
        const { Club } = require('../models');
        const { id } = req.params;

        const club = await Club.findByPk(id);
        if (!club) {
            return next(new AppError('Club not found', 404, 'CLUB_NOT_FOUND'));
        }

        const allowedFields = [
            'name', 'description', 'category', 'image_url',
            'president_id', 'advisor_id', 'meeting_schedule',
            'location', 'max_members', 'is_active', 'contact_email', 'social_links'
        ];

        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                club[field] = req.body[field];
            }
        });

        await club.save();

        res.json({
            success: true,
            message: 'Club updated successfully',
            data: { club }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete club
 * DELETE /api/v1/clubs/:id
 */
const deleteClub = async (req, res, next) => {
    try {
        const { Club } = require('../models');
        const { id } = req.params;

        const club = await Club.findByPk(id);
        if (!club) {
            return next(new AppError('Club not found', 404, 'CLUB_NOT_FOUND'));
        }

        await club.destroy();

        res.json({
            success: true,
            message: 'Club deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Join club
 * POST /api/v1/clubs/:id/join
 */
const joinClub = async (req, res, next) => {
    try {
        const { Club, ClubMembership } = require('../models');
        const { id } = req.params;
        const userId = req.user.id;

        const club = await Club.findByPk(id);
        if (!club) {
            return next(new AppError('Club not found', 404, 'CLUB_NOT_FOUND'));
        }

        if (!club.is_active) {
            return next(new AppError('Club is not active', 400, 'CLUB_INACTIVE'));
        }

        // Check if already a member
        const existingMembership = await ClubMembership.findOne({
            where: { club_id: id, user_id: userId }
        });

        if (existingMembership) {
            return next(new AppError('Already a member of this club', 400, 'ALREADY_MEMBER'));
        }

        // Check max members
        if (club.max_members && club.member_count >= club.max_members) {
            return next(new AppError('Club has reached maximum capacity', 400, 'CLUB_FULL'));
        }

        // Create membership
        const membership = await ClubMembership.create({
            club_id: id,
            user_id: userId,
            role: 'member',
            status: 'active',
            joined_date: new Date()
        });

        // Update member count
        await club.increment('member_count');

        res.status(201).json({
            success: true,
            message: 'Successfully joined the club',
            data: { membership }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Leave club
 * DELETE /api/v1/clubs/:id/leave
 */
const leaveClub = async (req, res, next) => {
    try {
        const { Club, ClubMembership } = require('../models');
        const { id } = req.params;
        const userId = req.user.id;

        const membership = await ClubMembership.findOne({
            where: { club_id: id, user_id: userId }
        });

        if (!membership) {
            return next(new AppError('Not a member of this club', 400, 'NOT_MEMBER'));
        }

        await membership.destroy();

        // Update member count
        await Club.decrement('member_count', { where: { id } });

        res.json({
            success: true,
            message: 'Successfully left the club'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get user's clubs
 * GET /api/v1/clubs/user/my-clubs
 */
const getMyClubs = async (req, res, next) => {
    try {
        const { Club, ClubMembership, User } = require('../models');
        const userId = req.user.id;

        const memberships = await ClubMembership.findAll({
            where: { user_id: userId, status: 'active' },
            include: [
                {
                    model: Club,
                    as: 'club',
                    include: [
                        {
                            model: User,
                            as: 'president',
                            attributes: ['id', 'first_name', 'last_name']
                        }
                    ]
                }
            ]
        });

        const clubs = memberships.map(m => ({
            ...m.club.toJSON(),
            memberRole: m.role,
            joinedDate: m.joined_date
        }));

        res.json({
            success: true,
            data: { clubs }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get club members
 * GET /api/v1/clubs/:id/members
 */
const getClubMembers = async (req, res, next) => {
    try {
        const { ClubMembership, User } = require('../models');
        const { id } = req.params;

        const members = await ClubMembership.findAll({
            where: { club_id: id, status: 'active' },
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'email', 'first_name', 'last_name', 'profile_picture_url', 'role']
                }
            ],
            order: [
                ['role', 'ASC'],
                ['joined_date', 'ASC']
            ]
        });

        res.json({
            success: true,
            data: { members }
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getAllClubs,
    getClubById,
    createClub,
    updateClub,
    deleteClub,
    joinClub,
    leaveClub,
    getMyClubs,
    getClubMembers
};
